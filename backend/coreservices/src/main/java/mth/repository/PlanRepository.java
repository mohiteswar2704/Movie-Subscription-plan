package mth.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import mth.models.Plan;

@Repository
public interface PlanRepository extends JpaRepository<Plan, Long> {

	List<Plan> findByActiveTrueOrderByMonthlyPriceAsc();

	Optional<Plan> findByPlanNameIgnoreCase(String planName);

	@Query("""
			select p from Plan p
			where lower(p.planName) like lower(concat('%', :term, '%'))
			   or lower(coalesce(p.description, '')) like lower(concat('%', :term, '%'))
			   or lower(coalesce(p.features, '')) like lower(concat('%', :term, '%'))
			order by p.monthlyPrice asc, p.durationMonths asc
			""")
	List<Plan> searchPlans(@Param("term") String term);
}